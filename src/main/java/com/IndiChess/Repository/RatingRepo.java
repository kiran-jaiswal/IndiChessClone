package com.IndiChess.Repository;

import com.IndiChess.Model.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RatingRepo extends JpaRepository<Rating, Long> {

}