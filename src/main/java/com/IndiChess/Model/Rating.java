package com.IndiChess.Model;

import com.IndiChess.Model.GameType;
import com.IndiChess.Model.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_ratings",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "game_type"})
)
public class Rating {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false)
    private GameType gameType;

    private int rating;

    private int gamesPlayed;
    private int wins;
    private int losses;
    private int draws;

    private LocalDateTime updatedAt;
}