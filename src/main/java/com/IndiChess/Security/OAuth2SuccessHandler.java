package com.IndiChess.Security;

import com.IndiChess.Model.User;
import com.IndiChess.Repository.UserRepository;
import jakarta.servlet.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository repository;

    public OAuth2SuccessHandler(JwtUtil jwtUtil, UserRepository repository) {
        this.jwtUtil = jwtUtil;
        this.repository = repository;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");

        User user = repository.findByEmail(email)
                .orElseGet(() -> {
                    User u = new User();
                    u.setEmail(email);
                    u.setName(name != null ? name : email);
                    u.setPassword("OAUTH2_USER");
                    return repository.save(u);
                });

        String token = jwtUtil.generateToken(user.getEmail());

        response.sendRedirect("http://localhost:8081/dashboard?token=" + token);
    }
}
