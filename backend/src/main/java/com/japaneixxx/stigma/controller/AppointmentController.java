package com.japaneixxx.stigma.controller;

import com.japaneixxx.stigma.domain.enums.AppointmentStatus;
import com.japaneixxx.stigma.dto.request.AppointmentRequest;
import com.japaneixxx.stigma.dto.response.AppointmentResponse;
import com.japaneixxx.stigma.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dashboard/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentResponse create(
            @AuthenticationPrincipal String tattooistId,
            @Valid @RequestBody AppointmentRequest request) {
        return appointmentService.create(UUID.fromString(tattooistId), request);
    }

    @GetMapping
    public List<AppointmentResponse> list(
            @AuthenticationPrincipal String tattooistId,
            @RequestParam(required = false) Instant start,
            @RequestParam(required = false) Instant end) {
        UUID id = UUID.fromString(tattooistId);
        if (start != null && end != null) {
            return appointmentService.listByRange(id, start, end);
        }
        return appointmentService.listAll(id);
    }

    @PatchMapping("/{appointmentId}/status")
    public AppointmentResponse updateStatus(
            @AuthenticationPrincipal String tattooistId,
            @PathVariable UUID appointmentId,
            @RequestParam AppointmentStatus status) {
        return appointmentService.updateStatus(UUID.fromString(tattooistId), appointmentId, status);
    }

    @PatchMapping("/{appointmentId}/reschedule")
    public AppointmentResponse reschedule(
            @AuthenticationPrincipal String tattooistId,
            @PathVariable UUID appointmentId,
            @RequestParam Instant scheduledAt) {
        return appointmentService.reschedule(UUID.fromString(tattooistId), appointmentId, scheduledAt);
    }

    @DeleteMapping("/{appointmentId}")
    public void delete(
            @AuthenticationPrincipal String tattooistId,
            @PathVariable UUID appointmentId) {
        appointmentService.delete(UUID.fromString(tattooistId), appointmentId);
    }
}
