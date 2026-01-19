package com.IndiChess.Repository;

import com.IndiChess.Model.Move;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MoveRepo extends JpaRepository<Move, Long> {
}