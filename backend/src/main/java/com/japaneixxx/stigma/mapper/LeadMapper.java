package com.japaneixxx.stigma.mapper;

import com.japaneixxx.stigma.domain.entity.Lead;
import com.japaneixxx.stigma.dto.request.LeadRequest;
import com.japaneixxx.stigma.dto.response.LeadResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper
public interface LeadMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tattooist", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "quotedPrice", ignore = true)
    @Mapping(target = "tattooistNotes", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Lead toEntity(LeadRequest request);

    LeadResponse toResponse(Lead lead);
}
