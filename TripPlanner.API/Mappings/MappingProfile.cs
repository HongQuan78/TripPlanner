using AutoMapper;
using TripPlanner.API.DTOs.Requests;
using TripPlanner.API.DTOs.Responses;
using TripPlanner.API.Helpers;
using TripPlanner.API.Models;

namespace TripPlanner.API.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Destination, DestinationResponse>()
        .ForMember
        (
            dest => dest.OpeningHours,
            opt => opt.MapFrom((src, _) => src is Landmark l ? l.OpeningHours : null)
        )
        .ForMember
        (
            dest => dest.CuisineType,
            opt => opt.MapFrom((src, _) => src is Restaurant r ? r.CuisineType : null)
        )
        .ForMember
        (
            dest => dest.IsHalalFriendly,
            opt => opt.MapFrom((src, _) => src is Restaurant r ? (bool?)r.IsHalalFriendly : null)
        );
        CreateMap<CreateTripRequest, Trip>()
        .ConvertUsing(src => new Trip
        (
            0,
            src.Name!,
            DateHelper.ToDateOnly(src.StartDate!),
            DateHelper.ToDateOnly(src.EndDate!)
        ));
        CreateMap<TripDay, TripDayResponse>()
        .ForMember
        (
            dest => dest.Destinations,
            opt => opt.MapFrom(src => src.Destinations)
        );
        CreateMap<Trip, TripResponse>()
        .ForMember
        (
            dest => dest.TripDays,
            opt => opt.MapFrom(src => src.Days)
        );
        
    }
}