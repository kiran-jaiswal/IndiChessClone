package com.IndiChess.Controller;

import com.IndiChess.Model.Match;
import com.IndiChess.Service.MatchService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/match")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Configure properly in production
public class MatchController {

    private final MatchService matchService;

    /* ================= START PUBLIC MATCH ================= */
    @PostMapping("/start")
    public ResponseEntity<Match> startMatch(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        Match match = matchService.createMatch(principal.getName());

        if (match == null) {
            // User is waiting in queue
            return ResponseEntity.accepted().build();
        }

        return ResponseEntity.ok(match);
    }

    /* ================= CREATE PRIVATE MATCH ================= */
    @PostMapping("/create-private")
    public ResponseEntity<Match> createPrivateMatch(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        try {
            Match match = matchService.createPrivateMatch(principal.getName());
            return ResponseEntity.ok(match);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /* ================= JOIN MATCH ================= */
    @PostMapping("/{id}/join")
    public ResponseEntity<Match> joinMatch(
            @PathVariable Long id,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        try {
            Match match = matchService.joinMatch(id, principal.getName());
            return ResponseEntity.ok(match);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    /* ================= GET MATCH ================= */
    @GetMapping("/{id}")
    public ResponseEntity<Match> getMatch(@PathVariable Long id) {
        return matchService.getMatch(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /* ================= MAKE MOVE (REST) ================= */
    @PostMapping("/{id}/move")
    public ResponseEntity<?> makeMove(
            @PathVariable Long id,
            @RequestBody MoveRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        try {
            Match updatedMatch = matchService.makeMove(
                    id,
                    principal.getName(),
                    request.getUci()
            );
            return ResponseEntity.ok(updatedMatch);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /* ================= RESIGN ================= */
    @PostMapping("/{id}/resign")
    public ResponseEntity<?> resign(
            @PathVariable Long id,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        try {
            Match match = matchService.resign(id, principal.getName());
            return ResponseEntity.ok(match);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /* ================= GET GAMES COUNT ================= */
    @GetMapping("/stats/count")
    public ResponseEntity<Long> getGamesCount(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        // Implement this in MatchService if needed
        return ResponseEntity.ok(0L);
    }

    /* ================= MOVE REQUEST DTO ================= */
    @Data
    public static class MoveRequest {
        private String uci;
        private String san;      // Optional: for move list UI
        private String fenAfter; // IGNORED by server (server is authority)
    }
}