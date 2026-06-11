using AutoMapper;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Domain.Models;

namespace TripPlanner.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Destination, DestinationResponse>()
            .ForMember(dest => dest.OpeningHours,
                opt => opt.MapFrom((src, _) => src is Landmark l ? l.OpeningHours : null))
            .ForMember(dest => dest.CuisineType,
                opt => opt.MapFrom((src, _) => src is Restaurant r ? r.CuisineType : null))
            .ForMember(dest => dest.IsHalalFriendly,
                opt => opt.MapFrom((src, _) => src is Restaurant r ? (bool?)r.IsHalalFriendly : null));

        CreateMap<TripDay, TripDayResponse>()
            .ForMember(dest => dest.Destinations,
                opt => opt.MapFrom(src => src.Destinations));

        CreateMap<Trip, TripResponse>()
            .ForMember(dest => dest.TripDays,
                opt => opt.MapFrom(src => src.Days));
    }
}
