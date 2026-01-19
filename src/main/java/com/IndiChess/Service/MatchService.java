package com.IndiChess.Service;

import com.IndiChess.dto.MatchDTO;
import com.IndiChess.Model.*;
import com.IndiChess.Repository.MatchRepo;
import com.IndiChess.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchService {

    private final MatchRepo matchRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<GameType, ConcurrentLinkedQueue<String>> queues = new ConcurrentHashMap<>();

    {
        queues.put(GameType.BLITZ, new ConcurrentLinkedQueue<>());
        queues.put(GameType.RAPID, new ConcurrentLinkedQueue<>());
    }

    @Transactional
    public Match createMatch(String userEmail) {
        ConcurrentLinkedQueue<String> queue = queues.get(GameType.RAPID);
        if (queue.contains(userEmail)) return null;
        if (queue.isEmpty()) {
            queue.add(userEmail);
            return null;
        }
        String opponentEmail = queue.poll();
        return createMatchInternal(opponentEmail, userEmail, GameType.RAPID);
    }

    @Transactional
    public Match createPrivateMatch(String userEmail) {
        User player1 = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Match match = new Match();
        match.setPlayer1(player1);
        match.setGameType(GameType.RAPID);
        match.setFenCurrent("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        match.setCurrentTurnEmail(player1.getEmail());
        match.setCurrentPly(0);
        match.setStatus(MatchStatus.ONGOING);
        match.setStartedAt(LocalDateTime.now());
        match.setWhiteTime(600);
        match.setBlackTime(600);
        match.setLastMoveTime(System.currentTimeMillis());

        return matchRepository.save(match);
    }

    @Transactional
    public Match joinMatch(Long matchId, String userEmail) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getPlayer2() != null) {
            throw new RuntimeException("Match already full");
        }
        if (match.getPlayer1().getEmail().equals(userEmail)) {
            throw new RuntimeException("Cannot join your own match");
        }

        User player2 = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        match.setPlayer2(player2);
        match.setStatus(MatchStatus.ONGOING);
        match.setLastMoveTime(System.currentTimeMillis());

        Match savedMatch = matchRepository.save(match);

        // Send DTO instead of entity
        messagingTemplate.convertAndSend("/topic/game/" + matchId, MatchDTO.fromMatch(savedMatch));

        log.info("✅ Player 2 joined match {}", matchId);
        return savedMatch;
    }

    @Transactional
    public void processMatchmaking(String userEmail, GameType type) {
        ConcurrentLinkedQueue<String> queue = queues.get(type);
        if (queue.contains(userEmail)) return;

        if (queue.isEmpty()) {
            queue.add(userEmail);
            messagingTemplate.convertAndSendToUser(userEmail, "/queue/status", "searching");
        } else {
            String opponentEmail = queue.poll();
            Match match = createMatchInternal(opponentEmail, userEmail, type);
            messagingTemplate.convertAndSend("/topic/matchmaking/" + opponentEmail, match);
            messagingTemplate.convertAndSend("/topic/matchmaking/" + userEmail, match);
        }
    }

    private Match createMatchInternal(String email1, String email2, GameType type) {
        User p1 = userRepository.findByEmail(email1)
                .orElseThrow(() -> new RuntimeException("Player1 not found"));
        User p2 = userRepository.findByEmail(email2)
                .orElseThrow(() -> new RuntimeException("Player2 not found"));

        Match match = new Match();
        match.setPlayer1(p1);
        match.setPlayer2(p2);
        match.setGameType(type);
        match.setFenCurrent("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        match.setCurrentTurnEmail(p1.getEmail());
        match.setCurrentPly(0);
        match.setStatus(MatchStatus.ONGOING);
        match.setStartedAt(LocalDateTime.now());

        int initialTime = type == GameType.BLITZ ? 180 : 600;
        match.setWhiteTime(initialTime);
        match.setBlackTime(initialTime);
        match.setLastMoveTime(System.currentTimeMillis());

        return matchRepository.save(match);
    }

    public Optional<Match> getMatch(Long id) {
        return matchRepository.findById(id);
    }

    @Transactional
    public Match makeMove(Long matchId, String email, String uci) {
        log.info("=== MOVE: Match {}, Player {}, UCI {} ===", matchId, email, uci);

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getStatus() != MatchStatus.ONGOING) {
            throw new RuntimeException("Game is not active");
        }
        if (match.getPlayer2() == null) {
            throw new RuntimeException("Waiting for opponent to join");
        }
        if (!email.equals(match.getCurrentTurnEmail())) {
            throw new RuntimeException("Not your turn");
        }
        if (uci == null || uci.length() < 4 || uci.length() > 5) {
            throw new RuntimeException("Invalid UCI format");
        }

        char fromFile = uci.charAt(0);
        char fromRank = uci.charAt(1);
        char toFile = uci.charAt(2);
        char toRank = uci.charAt(3);

        if (fromFile < 'a' || fromFile > 'h' || toFile < 'a' || toFile > 'h' ||
                fromRank < '1' || fromRank > '8' || toRank < '1' || toRank > '8') {
            throw new RuntimeException("Invalid square coordinates");
        }

        String currentFen = match.getFenCurrent();
        String[] fenParts = currentFen.split(" ");
        String activeColor = fenParts[1];

        boolean isWhiteTurn = activeColor.equals("w");
        boolean isPlayer1 = email.equals(match.getPlayer1().getEmail());

        if (isWhiteTurn != isPlayer1) {
            throw new RuntimeException("Wrong color to move");
        }

        // Timer logic - only after first move
        long now = System.currentTimeMillis();

        if (match.getCurrentPly() > 0) {
            Long lastMoveTime = match.getLastMoveTime();
            if (lastMoveTime != null && lastMoveTime > 0) {
                long elapsedSeconds = (now - lastMoveTime) / 1000;

                if (elapsedSeconds > 60) elapsedSeconds = 60;
                if (elapsedSeconds < 0) elapsedSeconds = 0;

                boolean isWhiteMove = email.equals(match.getPlayer1().getEmail());

                if (isWhiteMove) {
                    int newTime = match.getWhiteTime() - (int) elapsedSeconds;
                    if (newTime <= 0) {
                        match.setWhiteTime(0);
                        match.setStatus(MatchStatus.BLACK_WIN);
                        match.setFinishedAt(LocalDateTime.now());
                        Match finishedMatch = matchRepository.save(match);
                        messagingTemplate.convertAndSend("/topic/game/" + matchId, MatchDTO.fromMatch(finishedMatch));
                        log.info("⏰ White timeout");
                        return finishedMatch;
                    }
                    match.setWhiteTime(newTime);
                } else {
                    int newTime = match.getBlackTime() - (int) elapsedSeconds;
                    if (newTime <= 0) {
                        match.setBlackTime(0);
                        match.setStatus(MatchStatus.WHITE_WIN);
                        match.setFinishedAt(LocalDateTime.now());
                        Match finishedMatch = matchRepository.save(match);
                        messagingTemplate.convertAndSend("/topic/game/" + matchId, MatchDTO.fromMatch(finishedMatch));
                        log.info("⏰ Black timeout");
                        return finishedMatch;
                    }
                    match.setBlackTime(newTime);
                }
            }
        }

        Move move = new Move();
        move.setMatch(match);
        move.setUci(uci);
        move.setPly(match.getCurrentPly() + 1);
        move.setMoveNumber((int) Math.ceil(move.getPly() / 2.0));
        move.setColor(move.getPly() % 2 != 0 ? PieceColor.WHITE : PieceColor.BLACK);
        move.setCreatedAt(LocalDateTime.now());

        match.addMove(move);
        match.setLastMoveUci(uci);
        match.setFenCurrent(applyMoveToFen(match.getFenCurrent(), uci));

        String nextTurn = email.equals(match.getPlayer1().getEmail())
                ? match.getPlayer2().getEmail()
                : match.getPlayer1().getEmail();

        match.setCurrentTurnEmail(nextTurn);
        match.setLastMoveTime(now);

        Match savedMatch = matchRepository.save(match);
        log.info("✅ Move complete - Status: {}", savedMatch.getStatus());
        return savedMatch;
    }

    @Transactional
    public Match resign(Long matchId, String email) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        if (match.getStatus() != MatchStatus.ONGOING) {
            throw new RuntimeException("Game is not active");
        }
        if (!email.equals(match.getPlayer1().getEmail()) &&
                !email.equals(match.getPlayer2().getEmail())) {
            throw new RuntimeException("You are not in this match");
        }

        boolean isPlayer1Resigning = email.equals(match.getPlayer1().getEmail());
        match.setStatus(isPlayer1Resigning ? MatchStatus.BLACK_WIN : MatchStatus.WHITE_WIN);
        match.setFinishedAt(LocalDateTime.now());

        Match savedMatch = matchRepository.save(match);
        messagingTemplate.convertAndSend("/topic/game/" + matchId, MatchDTO.fromMatch(savedMatch));
        return savedMatch;
    }

    @Transactional
    public Match makeMove(Long matchId, String email, String uci, String san, String fen) {
        return makeMove(matchId, email, uci);
    }

    private String applyMoveToFen(String fen, String uci) {
        String[] parts = fen.split(" ");
        String boardPart = parts[0];
        String currentTurn = parts[1];

        int fromFile = uci.charAt(0) - 'a';
        int fromRank = 8 - (uci.charAt(1) - '0');
        int toFile = uci.charAt(2) - 'a';
        int toRank = 8 - (uci.charAt(3) - '0');

        String[][] board = new String[8][8];
        String[] rows = boardPart.split("/");
        for (int r = 0; r < 8; r++) {
            int c = 0;
            for (char ch : rows[r].toCharArray()) {
                if (Character.isDigit(ch)) {
                    int emptySquares = ch - '0';
                    for (int i = 0; i < emptySquares; i++) {
                        board[r][c++] = "";
                    }
                } else {
                    board[r][c++] = String.valueOf(ch);
                }
            }
        }

        String piece = board[fromRank][fromFile];
        board[toRank][toFile] = piece;
        board[fromRank][fromFile] = "";

        if ((piece.equals("P") && toRank == 0) || (piece.equals("p") && toRank == 7)) {
            board[toRank][toFile] = piece.equals("P") ? "Q" : "q";
        }

        StringBuilder newBoardPart = new StringBuilder();
        for (int r = 0; r < 8; r++) {
            int emptyCount = 0;
            for (int c = 0; c < 8; c++) {
                if (board[r][c].isEmpty()) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        newBoardPart.append(emptyCount);
                        emptyCount = 0;
                    }
                    newBoardPart.append(board[r][c]);
                }
            }
            if (emptyCount > 0) {
                newBoardPart.append(emptyCount);
            }
            if (r < 7) {
                newBoardPart.append("/");
            }
        }

        String newTurn = currentTurn.equals("w") ? "b" : "w";
        return newBoardPart.toString() + " " + newTurn + " KQkq - 0 1";
    }
}
