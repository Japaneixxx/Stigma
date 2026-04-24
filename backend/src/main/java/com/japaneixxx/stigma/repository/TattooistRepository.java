package com.japaneixxx.stigma.repository;

import com.japaneixxx.stigma.domain.entity.Tattooist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TattooistRepository extends JpaRepository<Tattooist, UUID> {
    Optional<Tattooist> findBySlugAndActiveTrue(String slug);
    Optional<Tattooist> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsBySlug(String slug);
}
