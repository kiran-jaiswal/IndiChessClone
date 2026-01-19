package com.IndiChess.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "moves")
@Data
public class Move {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // CRITICAL: Add @JsonIgnore to prevent circular reference
    @ManyToOne
    @JoinColumn(name = "match_id")
    @JsonIgnore  // <-- THIS IS THE FIX
    private Match match;

    @Column(name = "uci", length = 10, nullable = false)
    private String uci;

    @Column(name = "san", length = 20)
    private String san;

    @Column(name = "ply", nullable = false)
    private Integer ply;

    @Column(name = "move_number", nullable = false)
    private Integer moveNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "color", nullable = false)
    private PieceColor color;

    @Column(name = "fen_before", length = 200)
    private String fenBefore;

    @Column(name = "fen_after", length = 200)
    private String fenAfter;

    @Column(name = "move_time_ms")
    private Long moveTimeMs;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}