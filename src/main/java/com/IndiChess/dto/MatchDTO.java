package com.IndiChess.dto;

import com.IndiChess.Model.GameType;
import com.IndiChess.Model.Match;
import com.IndiChess.Model.MatchStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MatchDTO {
    private Long id;
    private MatchStatus status;
    private GameType gameType;

    // Player emails (not full User objects)
    private String player1Email;
    private String player2Email;

    // Game state
    private String fenCurrent;
    private String currentTurnEmail;
    private Integer currentPly;
    private String lastMoveUci;

    // Timers
    private Integer whiteTime;
    private Integer blackTime;
    private Long lastMoveTime;

    // Timestamps
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;

    // Static factory method to create DTO from Match entity
    public static MatchDTO fromMatch(Match match) {
        MatchDTO dto = new MatchDTO();
        dto.setId(match.getId());
        dto.setStatus(match.getStatus());
        dto.setGameType(match.getGameType());

        if (match.getPlayer1() != null) {
            dto.setPlayer1Email(match.getPlayer1().getEmail());
        }
        if (match.getPlayer2() != null) {
            dto.setPlayer2Email(match.getPlayer2().getEmail());
        }

        dto.setFenCurrent(match.getFenCurrent());
        dto.setCurrentTurnEmail(match.getCurrentTurnEmail());
        dto.setCurrentPly(match.getCurrentPly());
        dto.setLastMoveUci(match.getLastMoveUci());

        dto.setWhiteTime(match.getWhiteTime());
        dto.setBlackTime(match.getBlackTime());
        dto.setLastMoveTime(match.getLastMoveTime());

        dto.setStartedAt(match.getStartedAt());
        dto.setFinishedAt(match.getFinishedAt());

        return dto;
    }
}