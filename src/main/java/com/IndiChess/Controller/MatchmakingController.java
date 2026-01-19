package com.IndiChess.Controller;

import com.IndiChess.Model.GameType;
import com.IndiChess.Service.MatchService;
import lombok.Data;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import java.security.Principal;

@Controller
public class MatchmakingController {
    private final MatchService matchService;

    public MatchmakingController(MatchService matchService) {
        this.matchService = matchService;
    }

    @MessageMapping("/matchmaking/join")
    public void joinQueue(@Payload MatchmakingRequest request, Principal principal) {
        // Principal.getName() returns the user email from the JWT
        matchService.processMatchmaking(principal.getName(), request.getGameType());
    }

    @Data
    public static class MatchmakingRequest {
        private GameType gameType;
    }
}