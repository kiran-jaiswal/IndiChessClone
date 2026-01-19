package com.IndiChess.Controller;

import com.IndiChess.Model.User;
import com.IndiChess.Repository.UserRepository;
import com.IndiChess.Security.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/auth")
// Ensure CORS matches your frontend port
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final UserRepository repository;
    private final PasswordEncoder encoder;

    public AuthController(AuthenticationManager authManager, JwtUtil jwtUtil,
                          UserRepository repository, PasswordEncoder encoder) {
        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.repository = repository;
        this.encoder = encoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (repository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already taken");
        }
        user.setPassword(encoder.encode(user.getPassword()));
        repository.save(user);
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest, HttpServletResponse response) {
        try {
            // Authenticate the user against the DB
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword())
            );

            String token = jwtUtil.generateToken(loginRequest.getEmail());

            // Set HttpOnly cookie for security
            Cookie cookie = new Cookie("token", token);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge(24 * 60 * 60);
            response.addCookie(cookie);

            // Return JSON so api.ts can read 'token' and 'email'
            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "email", loginRequest.getEmail(),
                    "message", "Login Successful"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Invalid email or password");
        }
    }
}