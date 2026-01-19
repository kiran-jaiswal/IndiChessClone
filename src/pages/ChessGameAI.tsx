import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Trophy, AlertCircle, Brain } from "lucide-react";

/* ================= TYPES ================= */
type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
type Color = "w" | "b";
type Square = [number, number];

interface Piece {
    type: PieceType;
    color: Color;
    hasMoved?: boolean;
}

type Board = (Piece | null)[][];

interface GameState {
    board: Board;
    turn: Color;
    enPassantTarget: Square | null;
    isCheck: boolean;
    castlingRights: {
        whiteKingSide: boolean;
        whiteQueenSide: boolean;
        blackKingSide: boolean;
        blackQueenSide: boolean;
    };
    halfMoveClock: number;
    fullMoveNumber: number;
}

interface MoveEntry {
    moveNumber: number;
    white?: string;
    black?: string;
}

interface PromotionRequest {
    from: Square;
    to: Square;
}

type GameEndState = {
    type: "checkmate" | "stalemate" | "draw" | "repetition" | "fifty-move";
    winner?: Color;
} | null;

/* ================= PIECE-SQUARE TABLES FOR AI ================= */
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PAWN_TABLE = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_TABLE = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_TABLE = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_TABLE = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_TABLE = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_TABLE_MIDDLE = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

const KING_TABLE_END = [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50]
];

/* ================= BOARD CREATION ================= */
function createInitialBoard(): Board {
    const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    const backRank: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

    for (let i = 0; i < 8; i++) {
        board[0][i] = { type: backRank[i], color: "b", hasMoved: false };
        board[1][i] = { type: "p", color: "b", hasMoved: false };
        board[6][i] = { type: "p", color: "w", hasMoved: false };
        board[7][i] = { type: backRank[i], color: "w", hasMoved: false };
    }
    return board;
}

function cloneBoard(b: Board): Board {
    return b.map(row => row.map(c => (c ? { ...c } : null)));
}

/* ================= MOVE GENERATION ================= */
function getPseudoLegalMoves(board: Board, row: number, col: number, enPassantTarget: Square | null = null): Square[] {
    const piece = board[row][col];
    if (!piece) return [];

    const moves: Square[] = [];
    const addIfValid = (r: number, c: number) => {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const target = board[r][c];
            if (!target || target.color !== piece.color) {
                moves.push([r, c]);
            }
        }
    };

    const addLine = (dr: number, dc: number) => {
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const target = board[r][c];
            if (!target) {
                moves.push([r, c]);
            } else {
                if (target.color !== piece.color) moves.push([r, c]);
                break;
            }
            r += dr; c += dc;
        }
    };

    switch (piece.type) {
        case "p": {
            const dir = piece.color === "w" ? -1 : 1;
            const startRow = piece.color === "w" ? 6 : 1;

            if (!board[row + dir]?.[col]) {
                moves.push([row + dir, col]);
                if (row === startRow && !board[row + 2 * dir]?.[col]) {
                    moves.push([row + 2 * dir, col]);
                }
            }

            [-1, 1].forEach(dc => {
                const r = row + dir, c = col + dc;
                if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const target = board[r][c];
                    if (target && target.color !== piece.color) {
                        moves.push([r, c]);
                    }
                    if (enPassantTarget && r === enPassantTarget[0] && c === enPassantTarget[1]) {
                        moves.push([r, c]);
                    }
                }
            });
            break;
        }
        case "n":
            [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => {
                addIfValid(row + dr, col + dc);
            });
            break;
        case "b":
            [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => addLine(dr, dc));
            break;
        case "r":
            [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => addLine(dr, dc));
            break;
        case "q":
            [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) => addLine(dr, dc));
            break;
        case "k":
            [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(([dr, dc]) => {
                addIfValid(row + dr, col + dc);
            });
            break;
    }
    return moves;
}

function isSquareAttacked(board: Board, square: Square, byColor: Color): boolean {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === byColor) {
                const moves = getPseudoLegalMoves(board, r, c);
                if (moves.some(([mr, mc]) => mr === square[0] && mc === square[1])) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isKingInCheck(board: Board, color: Color): boolean {
    let kingPos: Square | null = null;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c]?.type === "k" && board[r][c]?.color === color) {
                kingPos = [r, c];
                break;
            }
        }
        if (kingPos) break;
    }
    if (!kingPos) return false;
    return isSquareAttacked(board, kingPos, color === "w" ? "b" : "w");
}

function getLegalMoves(state: GameState, row: number, col: number): Square[] {
    const piece = state.board[row][col];
    if (!piece || piece.color !== state.turn) return [];

    let moves = getPseudoLegalMoves(state.board, row, col, state.enPassantTarget);

    // Add castling
    if (piece.type === "k" && !piece.hasMoved && !isKingInCheck(state.board, piece.color)) {
        const rank = piece.color === "w" ? 7 : 0;
        const enemy = piece.color === "w" ? "b" : "w";

        // Kingside
        if (
            (piece.color === "w" ? state.castlingRights.whiteKingSide : state.castlingRights.blackKingSide) &&
            !state.board[rank][5] && !state.board[rank][6] &&
            !isSquareAttacked(state.board, [rank, 5], enemy) &&
            !isSquareAttacked(state.board, [rank, 6], enemy)
        ) {
            moves.push([rank, 6]);
        }

        // Queenside
        if (
            (piece.color === "w" ? state.castlingRights.whiteQueenSide : state.castlingRights.blackQueenSide) &&
            !state.board[rank][1] && !state.board[rank][2] && !state.board[rank][3] &&
            !isSquareAttacked(state.board, [rank, 2], enemy) &&
            !isSquareAttacked(state.board, [rank, 3], enemy)
        ) {
            moves.push([rank, 2]);
        }
    }

    // Filter moves that would leave king in check
    return moves.filter(([r, c]) => {
        const newBoard = cloneBoard(state.board);
        const targetPiece = newBoard[r][c];
        newBoard[r][c] = newBoard[row][col];
        newBoard[row][col] = null;

        // Handle en passant capture
        if (piece.type === "p" && state.enPassantTarget && r === state.enPassantTarget[0] && c === state.enPassantTarget[1] && !targetPiece) {
            newBoard[row][c] = null;
        }

        // Handle castling rook move
        if (piece.type === "k" && Math.abs(c - col) === 2) {
            if (c === 6) {
                newBoard[row][5] = newBoard[row][7];
                newBoard[row][7] = null;
            } else if (c === 2) {
                newBoard[row][3] = newBoard[row][0];
                newBoard[row][0] = null;
            }
        }

        return !isKingInCheck(newBoard, piece.color);
    });
}

/* ================= AI EVALUATION ================= */
function evaluatePosition(board: Board, color: Color): number {
    let score = 0;
    let pieceCount = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;

            pieceCount++;
            const multiplier = piece.color === color ? 1 : -1;
            let value = PIECE_VALUES[piece.type];

            // Add positional bonus
            const tableRow = piece.color === "w" ? 7 - r : r;
            let posBonus = 0;

            switch (piece.type) {
                case "p": posBonus = PAWN_TABLE[tableRow][c]; break;
                case "n": posBonus = KNIGHT_TABLE[tableRow][c]; break;
                case "b": posBonus = BISHOP_TABLE[tableRow][c]; break;
                case "r": posBonus = ROOK_TABLE[tableRow][c]; break;
                case "q": posBonus = QUEEN_TABLE[tableRow][c]; break;
                case "k":
                    posBonus = pieceCount < 16 ? KING_TABLE_END[tableRow][c] : KING_TABLE_MIDDLE[tableRow][c];
                    break;
            }

            score += (value + posBonus) * multiplier;
        }
    }

    return score;
}

function minimax(
    state: GameState,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    aiColor: Color
): { score: number; move?: { from: Square; to: Square } } {
    if (depth === 0) {
        return { score: evaluatePosition(state.board, aiColor) };
    }

    const moves: { from: Square; to: Square }[] = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state.board[r][c]?.color === state.turn) {
                const legal = getLegalMoves(state, r, c);
                legal.forEach(to => moves.push({ from: [r, c], to }));
            }
        }
    }

    if (moves.length === 0) {
        if (isKingInCheck(state.board, state.turn)) {
            return { score: maximizing ? -100000 : 100000 };
        }
        return { score: 0 };
    }

    // Move ordering: captures first
    moves.sort((a, b) => {
        const captureA = state.board[a.to[0]][a.to[1]] ? 1 : 0;
        const captureB = state.board[b.to[0]][b.to[1]] ? 1 : 0;
        return captureB - captureA;
    });

    if (maximizing) {
        let maxScore = -Infinity;
        let bestMove = moves[0];

        for (const move of moves) {
            const newState = applyMoveToState(state, move.from, move.to);
            const result = minimax(newState, depth - 1, alpha, beta, false, aiColor);

            if (result.score > maxScore) {
                maxScore = result.score;
                bestMove = move;
            }

            alpha = Math.max(alpha, result.score);
            if (beta <= alpha) break;
        }

        return { score: maxScore, move: bestMove };
    } else {
        let minScore = Infinity;
        let bestMove = moves[0];

        for (const move of moves) {
            const newState = applyMoveToState(state, move.from, move.to);
            const result = minimax(newState, depth - 1, alpha, beta, true, aiColor);

            if (result.score < minScore) {
                minScore = result.score;
                bestMove = move;
            }

            beta = Math.min(beta, result.score);
            if (beta <= alpha) break;
        }

        return { score: minScore, move: bestMove };
    }
}

function applyMoveToState(state: GameState, from: Square, to: Square, promotion?: PieceType): GameState {
    const newBoard = cloneBoard(state.board);
    const piece = newBoard[from[0]][from[1]]!;

    // En passant capture
    if (piece.type === "p" && state.enPassantTarget && to[0] === state.enPassantTarget[0] && to[1] === state.enPassantTarget[1] && !newBoard[to[0]][to[1]]) {
        newBoard[from[0]][to[1]] = null;
    }

    // Castling
    if (piece.type === "k" && Math.abs(to[1] - from[1]) === 2) {
        if (to[1] === 6) {
            newBoard[from[0]][5] = { ...newBoard[from[0]][7]!, hasMoved: true };
            newBoard[from[0]][7] = null;
        } else if (to[1] === 2) {
            newBoard[from[0]][3] = { ...newBoard[from[0]][0]!, hasMoved: true };
            newBoard[from[0]][0] = null;
        }
    }

    // Promotion
    if (piece.type === "p" && (to[0] === 0 || to[0] === 7)) {
        newBoard[to[0]][to[1]] = { type: promotion || "q", color: piece.color, hasMoved: true };
    } else {
        newBoard[to[0]][to[1]] = { ...piece, hasMoved: true };
    }

    newBoard[from[0]][from[1]] = null;

    // Update castling rights
    const newRights = { ...state.castlingRights };
    if (piece.type === "k") {
        if (piece.color === "w") {
            newRights.whiteKingSide = false;
            newRights.whiteQueenSide = false;
        } else {
            newRights.blackKingSide = false;
            newRights.blackQueenSide = false;
        }
    }
    if (piece.type === "r") {
        if (piece.color === "w" && from[0] === 7) {
            if (from[1] === 0) newRights.whiteQueenSide = false;
            if (from[1] === 7) newRights.whiteKingSide = false;
        }
        if (piece.color === "b" && from[0] === 0) {
            if (from[1] === 0) newRights.blackQueenSide = false;
            if (from[1] === 7) newRights.blackKingSide = false;
        }
    }

    // En passant target
    let newEnPassant: Square | null = null;
    if (piece.type === "p" && Math.abs(to[0] - from[0]) === 2) {
        newEnPassant = [(from[0] + to[0]) / 2, from[1]];
    }

    // Half move clock
    const isCapture = state.board[to[0]][to[1]] !== null;
    const newHalfMoveClock = (piece.type === "p" || isCapture) ? 0 : state.halfMoveClock + 1;

    return {
        board: newBoard,
        turn: state.turn === "w" ? "b" : "w",
        enPassantTarget: newEnPassant,
        isCheck: isKingInCheck(newBoard, state.turn === "w" ? "b" : "w"),
        castlingRights: newRights,
        halfMoveClock: newHalfMoveClock,
        fullMoveNumber: state.turn === "b" ? state.fullMoveNumber + 1 : state.fullMoveNumber
    };
}

function checkGameEnd(state: GameState): GameEndState {
    let hasLegalMoves = false;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state.board[r][c]?.color === state.turn) {
                const moves = getLegalMoves(state, r, c);
                if (moves.length > 0) {
                    hasLegalMoves = true;
                    break;
                }
            }
        }
        if (hasLegalMoves) break;
    }

    if (!hasLegalMoves) {
        if (state.isCheck) {
            return { type: "checkmate", winner: state.turn === "w" ? "b" : "w" };
        }
        return { type: "stalemate" };
    }

    if (state.halfMoveClock >= 100) {
        return { type: "fifty-move" };
    }

    // Check for insufficient material
    const pieces: Piece[] = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state.board[r][c]) pieces.push(state.board[r][c]!);
        }
    }

    if (pieces.length === 2) return { type: "draw" }; // K vs K
    if (pieces.length === 3) {
        const nonKing = pieces.find(p => p.type !== "k");
        if (nonKing && (nonKing.type === "n" || nonKing.type === "b")) {
            return { type: "draw" }; // K+N vs K or K+B vs K
        }
    }

    return null;
}

/* ================= COMPONENT ================= */
export default function ChessGameAI() {
    const movesEndRef = useRef<HTMLDivElement | null>(null);

    const [gameState, setGameState] = useState<GameState>({
        board: createInitialBoard(),
        turn: "w",
        enPassantTarget: null,
        isCheck: false,
        castlingRights: {
            whiteKingSide: true,
            whiteQueenSide: true,
            blackKingSide: true,
            blackQueenSide: true
        },
        halfMoveClock: 0,
        fullMoveNumber: 1
    });

    const [moves, setMoves] = useState<MoveEntry[]>([]);
    const [moveFrom, setMoveFrom] = useState<Square | null>(null);
    const [legalTargets, setLegalTargets] = useState<Square[]>([]);
    const [promotionReq, setPromotionReq] = useState<PromotionRequest | null>(null);
    const [gameEnd, setGameEnd] = useState<GameEndState>(null);
    const [aiThinking, setAiThinking] = useState(false);
    const [positionHistory, setPositionHistory] = useState<string[]>([]);

    useEffect(() => {
        movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [moves]);

    const pieceSymbols: Record<PieceType, string> = {
        "k": "♔", "q": "♕", "r": "♖", "b": "♗", "n": "♘", "p": "♙"
    };

    const getPieceDisplay = (piece: Piece) => pieceSymbols[piece.type];
    const sq = ([r, c]: Square) => `${String.fromCharCode(97 + c)}${8 - r}`;

    const boardToString = (board: Board) => {
        return board.map(row =>
            row.map(p => p ? `${p.color}${p.type}` : '--').join('')
        ).join('|');
    };

    function executeMove(from: Square, to: Square, promotion?: PieceType) {
        const piece = gameState.board[from[0]][from[1]]!;

        if (piece.type === "p" && (to[0] === 0 || to[0] === 7) && !promotion) {
            setPromotionReq({ from, to });
            return;
        }

        const newState = applyMoveToState(gameState, from, to, promotion);
        const posStr = boardToString(newState.board);
        const newHistory = [...positionHistory, posStr];

        // Check for threefold repetition
        const count = newHistory.filter(p => p === posStr).length;
        if (count >= 3) {
            setGameEnd({ type: "repetition" });
            return;
        }

        setMoves(prev => {
            const updated = [...prev];
            const notation = sq(from) + sq(to) + (promotion || '');

            if (gameState.turn === "w") {
                updated.push({ moveNumber: updated.length + 1, white: notation });
            } else {
                updated[updated.length - 1].black = notation;
            }
            return updated;
        });

        setGameState(newState);
        setPositionHistory(newHistory);
        setMoveFrom(null);
        setLegalTargets([]);
        setPromotionReq(null);

        const endState = checkGameEnd(newState);
        if (endState) {
            setGameEnd(endState);
            return;
        }

        if (gameState.turn === "w") {
            setTimeout(() => makeAIMove(newState), 500);
        }
    }

    function makeAIMove(currentState: GameState) {
        setAiThinking(true);

        setTimeout(() => {
            const depth = 4; // Adjust for difficulty (4 is very strong)
            const result = minimax(currentState, depth, -Infinity, Infinity, true, "b");

            if (result.move) {
                const piece = currentState.board[result.move.from[0]][result.move.from[1]]!;
                const promotion = piece.type === "p" && (result.move.to[0] === 0 || result.move.to[0] === 7) ? "q" : undefined;

                const newState = applyMoveToState(currentState, result.move.from, result.move.to, promotion);
                const posStr = boardToString(newState.board);
                const newHistory = [...positionHistory, posStr];

                setMoves(prev => {
                    const updated = [...prev];
                    const notation = sq(result.move!.from) + sq(result.move!.to) + (promotion || '');
                    updated[updated.length - 1].black = notation;
                    return updated;
                });

                setGameState(newState);
                setPositionHistory(newHistory);

                const endState = checkGameEnd(newState);
                if (endState) setGameEnd(endState);
            }

            setAiThinking(false);
        }, 100);
    }

    function onSquareClick(row: number, col: number) {
        if (gameState.turn !== "w" || promotionReq || gameEnd || aiThinking) return;

        const target: Square = [row, col];

        if (gameState.board[row][col]?.color === "w") {
            const legal = getLegalMoves(gameState, row, col);
            setMoveFrom([row, col]);
            setLegalTargets(legal);
            return;
        }

        if (moveFrom && legalTargets.some(m => m[0] === target[0] && m[1] === target[1])) {
            executeMove(moveFrom, target);
        }
    }

    function undo() {
        if (moves.length < 2 || gameEnd || aiThinking) return;
        const updated = [...moves];
        updated.pop();
        updated.pop();

        setMoves(updated);
        setGameState({
            board: createInitialBoard(),
            turn: "w",
            enPassantTarget: null,
            isCheck: false,
            castlingRights: {
                whiteKingSide: true,
                whiteQueenSide: true,
                blackKingSide: true,
                blackQueenSide: true
            },
            halfMoveClock: 0,
            fullMoveNumber: 1
        });
        setPositionHistory([]);
        setPromotionReq(null);
        setMoveFrom(null);
        setLegalTargets([]);
    }

    function resetGame() {
        setGameState({
            board: createInitialBoard(),
            turn: "w",
            enPassantTarget: null,
            isCheck: false,
            castlingRights: {
                whiteKingSide: true,
                whiteQueenSide: true,
                blackKingSide: true,
                blackQueenSide: true
            },
            halfMoveClock: 0,
            fullMoveNumber: 1
        });
        setMoves([]);
        setMoveFrom(null);
        setLegalTargets([]);
        setPromotionReq(null);
        setGameEnd(null);
        setPositionHistory([]);
    }

    const isLegalTarget = (r: number, c: number) => {
        return legalTargets.some(([tr, tc]) => tr === r && tc === c);
    };

    const isSelected = (r: number, c: number) => {
        return moveFrom && moveFrom[0] === r && moveFrom[1] === c;
    };

    return (
        <div className="flex items-center justify-center gap-8 p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen text-white">
            <div className="relative">
                <div className="inline-block border-8 border-amber-900 rounded-lg shadow-2xl">
                    {gameState.board.map((row, r) => (
                        <div key={r} className="flex">
                            {row.map((piece, c) => {
                                const isLight = (r + c) % 2 === 0;
                                const selected = isSelected(r, c);
                                const isLegal = isLegalTarget(r, c);

                                return (
                                    <div
                                        key={`${r}-${c}`}
                                        onClick={() => onSquareClick(r, c)}
                                        className={`
                                            w-20 h-20 flex items-center justify-center text-5xl cursor-pointer relative
                                            transition-all duration-200
                                            ${isLight ? "bg-[#f0d9b5]" : "bg-[#b58863]"}
                                            ${selected ? "ring-4 ring-blue-500 ring-inset" : ""}
                                            ${aiThinking ? "cursor-wait" : "hover:brightness-95"}
                                        `}
                                    >
                                        {piece && (
                                            <span className={`select-none pointer-events-none font-bold text-6xl ${
                                                piece.color === "w" ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : "text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]"
                                            }`}>
                                                {getPieceDisplay(piece)}
                                            </span>
                                        )}
                                        {isLegal && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className={`rounded-full ${piece ? 'w-16 h-16 border-4 border-green-500' : 'w-5 h-5 bg-green-500/60'}`} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {promotionReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-center mb-6 text-white">Promote Pawn</h2>
                        <div className="flex gap-4">
                            {(["q", "r", "b", "n"] as PieceType[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        executeMove(promotionReq.from, promotionReq.to, p);
                                    }}
                                    className="w-20 h-20 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center text-6xl transition-all hover:scale-110 hover:shadow-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                >
                                    {getPieceDisplay({ type: p, color: "w" })}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {gameEnd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-10 shadow-2xl text-center max-w-md">
                        {gameEnd.type === "checkmate" ? (
                            <>
                                <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-400" />
                                <h2 className="text-3xl font-bold mb-2">Checkmate!</h2>
                                <p className="text-xl mb-6">
                                    {gameEnd.winner === "w" ? "White" : "Black"} wins!
                                </p>
                            </>
                        ) : gameEnd.type === "stalemate" ? (
                            <>
                                <AlertCircle className="w-20 h-20 mx-auto mb-4 text-blue-400" />
                                <h2 className="text-3xl font-bold mb-2">Stalemate!</h2>
                                <p className="text-xl mb-6">The game is a draw.</p>
                            </>
                        ) : gameEnd.type === "fifty-move" ? (
                            <>
                                <AlertCircle className="w-20 h-20 mx-auto mb-4 text-blue-400" />
                                <h2 className="text-3xl font-bold mb-2">Fifty-Move Rule!</h2>
                                <p className="text-xl mb-6">The game is a draw.</p>
                            </>
                        ) : gameEnd.type === "repetition" ? (
                            <>
                                <AlertCircle className="w-20 h-20 mx-auto mb-4 text-blue-400" />
                                <h2 className="text-3xl font-bold mb-2">Threefold Repetition!</h2>
                                <p className="text-xl mb-6">The game is a draw.</p>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-20 h-20 mx-auto mb-4 text-blue-400" />
                                <h2 className="text-3xl font-bold mb-2">Draw!</h2>
                                <p className="text-xl mb-6">Insufficient material.</p>
                            </>
                        )}
                        <Button
                            onClick={resetGame}
                            className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 px-8 py-3 rounded-xl text-lg font-semibold"
                        >
                            New Game
                        </Button>
                    </div>
                </div>
            )}

            <div className="w-96 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-[640px]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Chess vs AI
                    </h1>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            onClick={undo}
                            disabled={moves.length < 2 || !!gameEnd || aiThinking}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-2 disabled:opacity-50"
                        >
                            <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={resetGame}
                            disabled={aiThinking}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-2"
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Turn:</span>
                        <span className={`font-bold text-lg ${gameState.turn === "w" ? "text-white" : "text-gray-400"}`}>
                            {gameState.turn === "w" ? "White (You)" : "Black (AI)"}
                        </span>
                    </div>
                    {gameState.isCheck && !gameEnd && (
                        <div className="mt-2 text-red-400 font-semibold text-center animate-pulse">
                            Check!
                        </div>
                    )}
                    {aiThinking && (
                        <div className="mt-2 text-blue-400 font-semibold text-center flex items-center justify-center gap-2">
                            <Brain className="w-4 h-4 animate-pulse" />
                            AI thinking...
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 overflow-hidden flex flex-col">
                    <h3 className="font-bold text-lg mb-3 text-gray-200">Move History</h3>
                    <div className="flex-1 overflow-y-auto">
                        {moves.length === 0 ? (
                            <p className="text-gray-500 text-center mt-4">No moves yet</p>
                        ) : (
                            <div className="space-y-1">
                                <div className="grid grid-cols-[40px_1fr_1fr] gap-3 px-3 text-sm text-gray-400 font-semibold">
                                    <span></span>
                                    <span className="text-white">White</span>
                                    <span className="text-gray-300">Black</span>
                                </div>
                                {moves.map((m) => (
                                    <div
                                        key={m.moveNumber}
                                        className="grid grid-cols-[40px_1fr_1fr] gap-3 py-2 px-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        <span className="text-gray-400 font-semibold">{m.moveNumber}.</span>
                                        <span className="font-mono text-white">{m.white || "—"}</span>
                                        <span className="font-mono text-gray-300">{m.black || "—"}</span>
                                    </div>
                                ))}
                                <div ref={movesEndRef} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}