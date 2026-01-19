package com.IndiChess.Model;

public enum PieceColor {
    WHITE,
    BLACK;

    public static PieceColor fromPly(int ply) {
        return (ply % 2 == 1) ? WHITE : BLACK;
    }

    public PieceColor opposite() {
        return this == WHITE ? BLACK : WHITE;
    }
}