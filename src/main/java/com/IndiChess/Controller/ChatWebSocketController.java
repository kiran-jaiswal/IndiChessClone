package com.IndiChess.Controller;

import com.IndiChess.Model.ChatMessage;
import com.IndiChess.Model.Match;
import com.IndiChess.Repository.ChatMessageRepository;
import com.IndiChess.Repository.MatchRepo;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final ChatMessageRepository chatMessageRepository;
    private final MatchRepo matchRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/game/{matchId}/chat")
    public void handleChatMessage(
            @DestinationVariable Long matchId,
            ChatMessageRequest request,
            Principal principal
    ) {
        if (principal == null) {
            log.error("❌ No principal for chat message");
            return;
        }

        String senderEmail = principal.getName();
        log.info("💬 Chat message - Match: {}, From: {}, Message: {}",
                matchId, senderEmail, request.getMessage());

        try {
            // Validate match exists
            Match match = matchRepository.findById(matchId)
                    .orElseThrow(() -> new RuntimeException("Match not found"));

            // Validate sender is part of the match
            if (!senderEmail.equals(match.getPlayer1().getEmail()) &&
                    (match.getPlayer2() == null || !senderEmail.equals(match.getPlayer2().getEmail()))) {
                throw new RuntimeException("Not a participant in this match");
            }

            // Save chat message
            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setMatch(match);
            chatMessage.setSenderEmail(senderEmail);
            chatMessage.setMessage(request.getMessage());
            chatMessage = chatMessageRepository.save(chatMessage);

            // Create response DTO
            Map<String, Object> messageDto = new HashMap<>();
            messageDto.put("id", chatMessage.getId());
            messageDto.put("senderEmail", chatMessage.getSenderEmail());
            messageDto.put("message", chatMessage.getMessage());
            messageDto.put("sentAt", chatMessage.getSentAt().toString());

            // Broadcast to both players
            String destination = "/topic/game/" + matchId + "/chat";
            messagingTemplate.convertAndSend(destination, (Object) messageDto);

            log.info("✅ Chat message broadcast successfully");

        } catch (Exception e) {
            log.error("❌ Error sending chat message: {}", e.getMessage());
        }
    }

    @Data
    public static class ChatMessageRequest {
        private String message;
    }
}