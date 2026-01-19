/* ================= 1. TYPES ================= */
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
    type: PieceType;
    color: Color;
    hasMoved: boolean;
}

export type Square = [number, number];
export type Board = (Piece | null)[][];

export interface GameState {
    board: Board;
    turn: Color;
    enPassantTarget: Square | null;
    isCheck: boolean;
}

/* ================= 2. INITIALIZATION ================= */
export const createInitialBoard = (): Board => {
    const layout: PieceType[] = ['r','n','b','q','k','b','n','r'];
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

    for (let i = 0; i < 8; i++) {
        board[0][i] = { type: layout[i], color: 'b', hasMoved: false };
        board[1][i] = { type: 'p', color: 'b', hasMoved: false };
        board[6][i] = { type: 'p', color: 'w', hasMoved: false };
        board[7][i] = { type: layout[i], color: 'w', hasMoved: false };
    }
    return board;
};

/* ================= 3. UTILS ================= */
const onBoard = (r: number, c: number) =>
    r >= 0 && r < 8 && c >= 0 && c < 8;

const cloneBoard = (b: Board): Board =>
    b.map(row => row.map(c => (c ? { ...c } : null)));

export const boardToFen = (board: Board): string => {
    let fen = "";
    for (let r = 0; r < 8; r++) {
        let empty = 0;
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) empty++;
            else {
                if (empty) { fen += empty; empty = 0; }
                fen += p.color === 'w'
                    ? p.type.toUpperCase()
                    : p.type;
            }
        }
        if (empty) fen += empty;
        if (r < 7) fen += "/";
    }
    return fen;
};

/* ================= 4. ATTACK DETECTION ================= */
const isSquareAttacked = (
    board: Board,
    target: Square,
    byColor: Color
): boolean => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p?.color === byColor) {
                const moves = getPseudoLegalMoves(board, r, c, null, true);
                if (moves.some(m => m[0] === target[0] && m[1] === target[1]))
                    return true;
            }
        }
    }
    return false;
};

/* ================= 5. PSEUDO MOVES ================= */
export const getPseudoLegalMoves = (
    board: Board,
    r: number,
    c: number,
    enPassantTarget: Square | null,
    attacksOnly = false
): Square[] => {
    const piece = board[r][c];
    if (!piece) return [];

    const moves: Square[] = [];
    const color = piece.color;
    const enemy = color === 'w' ? 'b' : 'w';

    const push = (nr: number, nc: number) => {
        if (!onBoard(nr, nc)) return false;
        if (!board[nr][nc]) {
            moves.push([nr, nc]);
            return true;
        }
        if (board[nr][nc]!.color === enemy) {
            moves.push([nr, nc]);
            return false;
        }
        return false;
    };

    switch (piece.type) {
        case 'n':
            [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
                .forEach(([dr,dc]) => {
                    const nr=r+dr,nc=c+dc;
                    if (onBoard(nr,nc) && board[nr][nc]?.color !== color)
                        moves.push([nr,nc]);
                });
            break;

        case 'b':
            [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => {
                for (let i=1;i<8;i++) if (!push(r+dr*i,c+dc*i)) break;
            });
            break;

        case 'r':
            [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
                for (let i=1;i<8;i++) if (!push(r+dr*i,c+dc*i)) break;
            });
            break;

        case 'q':
            [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]
                .forEach(([dr,dc]) => {
                    for (let i=1;i<8;i++) if (!push(r+dr*i,c+dc*i)) break;
                });
            break;

        case 'k':
            [[1,1],[1,0],[1,-1],[0,1],[0,-1],[-1,1],[-1,0],[-1,-1]]
                .forEach(([dr,dc]) => {
                    const nr=r+dr,nc=c+dc;
                    if (onBoard(nr,nc) && board[nr][nc]?.color !== color)
                        moves.push([nr,nc]);
                });

            /* CASTLING */
            if (!piece.hasMoved && !attacksOnly) {
                // King side
                if (
                    board[r][7]?.type === 'r' &&
                    !board[r][7]?.hasMoved &&
                    !board[r][5] && !board[r][6] &&
                    !isSquareAttacked(board,[r,4],enemy) &&
                    !isSquareAttacked(board,[r,5],enemy) &&
                    !isSquareAttacked(board,[r,6],enemy)
                ) moves.push([r,6]);

                // Queen side
                if (
                    board[r][0]?.type === 'r' &&
                    !board[r][0]?.hasMoved &&
                    !board[r][1] && !board[r][2] && !board[r][3] &&
                    !isSquareAttacked(board,[r,4],enemy) &&
                    !isSquareAttacked(board,[r,3],enemy) &&
                    !isSquareAttacked(board,[r,2],enemy)
                ) moves.push([r,2]);
            }
            break;

        case 'p':
            const dir = color === 'w' ? -1 : 1;

            if (!attacksOnly && onBoard(r+dir,c) && !board[r+dir][c]) {
                moves.push([r+dir,c]);
                if (!piece.hasMoved && !board[r+2*dir][c])
                    moves.push([r+2*dir,c]);
            }

            [[dir,1],[dir,-1]].forEach(([dr,dc]) => {
                const nr=r+dr,nc=c+dc;
                if (!onBoard(nr,nc)) return;
                if (board[nr][nc]?.color === enemy) moves.push([nr,nc]);
                if (
                    enPassantTarget &&
                    nr === enPassantTarget[0] &&
                    nc === enPassantTarget[1]
                ) moves.push([nr,nc]);
            });
            break;
    }
    return moves;
};

/* ================= 6. CHECK ================= */
export const isKingInCheck = (board: Board, color: Color): boolean => {
    let king: Square | null = null;
    for (let r=0;r<8;r++) for (let c=0;c<8;c++)
        if (board[r][c]?.type==='k' && board[r][c]?.color===color)
            king=[r,c];

    if (!king) return false;
    return isSquareAttacked(board, king, color==='w'?'b':'w');
};

/* ================= 7. LEGAL MOVES ================= */
export const getLegalMoves = (
    state: GameState,
    r: number,
    c: number
): Square[] => {
    const piece = state.board[r][c];
    if (!piece || piece.color !== state.turn) return [];

    const pseudo = getPseudoLegalMoves(
        state.board,
        r,
        c,
        state.enPassantTarget
    );

    return pseudo.filter(([tr,tc]) => {
        const test = cloneBoard(state.board);
        const p = test[r][c]!;

        /* EN PASSANT CAPTURE */
        if (
            p.type==='p' &&
            state.enPassantTarget &&
            tr===state.enPassantTarget[0] &&
            tc===state.enPassantTarget[1] &&
            !test[tr][tc]
        ) {
            test[r][tc] = null;
        }

        /* CASTLING */
        if (p.type==='k' && Math.abs(tc-c)===2) {
            if (tc===6) { test[r][5]=test[r][7]; test[r][7]=null; }
            if (tc===2) { test[r][3]=test[r][0]; test[r][0]=null; }
        }

        test[tr][tc] = { ...p, hasMoved:true };
        test[r][c] = null;

        return !isKingInCheck(test, state.turn);
    });
};

/* ================= 8. GAME STATUS ================= */
export const getGameStatus = (
    state: GameState
): 'playing' | 'checkmate' | 'stalemate' => {
    for (let r=0;r<8;r++) for (let c=0;c<8;c++)
        if (
            state.board[r][c]?.color===state.turn &&
            getLegalMoves(state,r,c).length>0
        ) return 'playing';

    return isKingInCheck(state.board,state.turn)
        ? 'checkmate'
        : 'stalemate';
};
