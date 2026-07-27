using AutoMapper;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Domain.Models;

namespace TripPlanner.Infrastructure.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Destination, DestinationResponse>()
            .ForMember(dest => dest.Xid, opt => opt.MapFrom(src => src.ExternalId))
            .ForMember(dest => dest.OpeningHours,
                opt => opt.MapFrom((src, _) => src is Landmark l ? l.OpeningHours : null));

        CreateMap<TripDay, TripDayResponse>()
            .ForMember(dest => dest.Destinations,
                opt => opt.MapFrom(src => src.Destinations));

        CreateMap<Trip, TripResponse>()
            .ForMember(dest => dest.TripDays,
                opt => opt.MapFrom(src => src.Days))
            .ForMember(dest => dest.SavedPlaces,
                opt => opt.MapFrom(src => src.SavedPlaces));
    }
}
