package com.IndiChess.Repository;

import com.IndiChess.Model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByMatchIdOrderBySentAtAsc(Long matchId);
}