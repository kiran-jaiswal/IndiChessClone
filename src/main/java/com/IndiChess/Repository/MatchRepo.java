package com.IndiChess.Repository;

import com.IndiChess.Model.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchRepo extends JpaRepository<Match, Long> {
    // This allows the service to count games for a specific user email
    long countByPlayer1EmailOrPlayer2Email(String email1, String email2);
}