package com.IndiChess.Model;

import java.util.Arrays;

public enum MatchStatus {
    WHITE_WIN(1),
    BLACK_WIN(-1),
    DRAW(0),
    ONGOING(2);


    private final int code;

    MatchStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static MatchStatus fromCode(int code) {
        return Arrays.stream(values())
                .filter(status -> status.code == code)
                .findFirst()
                .orElseThrow(() ->
                        new IllegalArgumentException("Invalid GameStatus code: " + code));
    }
}