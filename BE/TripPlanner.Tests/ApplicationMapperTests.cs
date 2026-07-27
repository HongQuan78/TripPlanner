using Xunit;
using TripPlanner.Application.Interfaces.Mapping;
using TripPlanner.Domain.Models;
using TripPlanner.Infrastructure.Mappings;

namespace TripPlanner.Tests;

public class ApplicationMapperTests
{
    private readonly IApplicationMapper _mapper = new ApplicationMapper();

    [Fact]
    public void MapToDestinationResponse_WithExternalId_PopulatesXid()
    {
        var destination = new Destination("Eiffel Tower", 4.8, "cultural", "9am-11pm", "xid123");

        var response = _mapper.MapToDestinationResponse(destination);

        Assert.Equal("xid123", response.Xid);
    }

    [Fact]
    public void MapToDestinationResponse_WithoutExternalId_XidIsNull()
    {
        var destination = new Destination("Eiffel Tower", 4.8, "cultural", "9am-11pm");

        var response = _mapper.MapToDestinationResponse(destination);

        Assert.Null(response.Xid);
    }

    [Fact]
    public void MapToDestinationResponse_PopulatesEveryMember()
    {
        var destination = SetId(new Destination("Louvre", 4.9, "museums", "9am-6pm", "xid-louvre"), 7);

        var response = _mapper.MapToDestinationResponse(destination);

        Assert.Equal(7, response.Id);
        Assert.Equal("Louvre", response.Name);
        Assert.Equal(4.9, response.Rating);
        Assert.Equal("museums", response.Category);
        Assert.Equal("xid-louvre", response.Xid);
        Assert.Equal("9am-6pm", response.OpeningHours);
    }

    [Fact]
    public void MapToDestinationResponse_WithoutOpeningHours_OpeningHoursIsNull()
    {
        var destination = new Destination("Ben Thanh Market", 4.2, "foods");

        var response = _mapper.MapToDestinationResponse(destination);

        Assert.Null(response.OpeningHours);
    }

    [Fact]
    public void MapToTripResponse_WithSavedPlaces_PopulatesSavedPlaces()
    {
        var trip = new Trip("Paris", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        trip.AddSavedPlace(new Destination("Louvre", 4.9, "cultural", "9am-6pm", "xid-louvre"));

        var response = _mapper.MapToTripResponse(trip);

        var savedPlace = Assert.Single(response.SavedPlaces);
        Assert.Equal("Louvre", savedPlace.Name);
        Assert.Equal("xid-louvre", savedPlace.Xid);
    }

    [Fact]
    public void MapToTripResponse_PopulatesScalarMembersAndGeneratedDays()
    {
        var trip = new Trip("Da Nang", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3), 42);

        var response = _mapper.MapToTripResponse(trip);

        Assert.Equal("Da Nang", response.Name);
        Assert.Equal(new DateOnly(2024, 6, 1), response.StartDate);
        Assert.Equal(new DateOnly(2024, 6, 3), response.EndDate);
        Assert.Equal(
            new[] { new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), new DateOnly(2024, 6, 3) },
            response.TripDays.Select(day => day.Day));
        Assert.Empty(response.SavedPlaces);
    }

    [Fact]
    public void MapToTripResponse_ProjectsNestedDayDestinations()
    {
        var trip = new Trip("Hoi An", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 2), 1);
        var firstDay = trip.Days.First(day => day.Day == new DateOnly(2024, 6, 1));
        var secondDay = trip.Days.First(day => day.Day == new DateOnly(2024, 6, 2));
        firstDay.AddDestination(SetId(new Destination("Ancient Town", 4.7, "historic", "8am-8pm", "xid-town"), 1));
        secondDay.AddDestination(SetId(new Destination("An Bang Beach", 4.5, "natural", null, "xid-beach"), 2));

        var response = _mapper.MapToTripResponse(trip);

        Assert.Equal(2, response.TripDays.Count);
        var mappedFirst = Assert.Single(response.TripDays[0].Destinations);
        Assert.Equal("Ancient Town", mappedFirst.Name);
        Assert.Equal("xid-town", mappedFirst.Xid);
        Assert.Equal("8am-8pm", mappedFirst.OpeningHours);
        var mappedSecond = Assert.Single(response.TripDays[1].Destinations);
        Assert.Equal("An Bang Beach", mappedSecond.Name);
        Assert.Equal("natural", mappedSecond.Category);
        Assert.Null(mappedSecond.OpeningHours);
    }

    [Fact]
    public void MapToTripDayResponse_ProjectsDestinationsInPositionOrder()
    {
        var tripDay = new TripDay(new DateOnly(2024, 6, 1));
        tripDay.AddDestination(SetId(new Destination("First", 4.0, "cultural"), 1));
        tripDay.AddDestination(SetId(new Destination("Second", 4.1, "cultural"), 2));
        tripDay.AddDestination(SetId(new Destination("Third", 4.2, "cultural"), 3));
        tripDay.ReorderDestinations(new[] { 3, 1, 2 });

        var response = _mapper.MapToTripDayResponse(tripDay);

        Assert.Equal(new DateOnly(2024, 6, 1), response.Day);
        Assert.Equal(new[] { "Third", "First", "Second" }, response.Destinations.Select(item => item.Name));
    }

    [Fact]
    public void MapToTripResponse_ProjectsNestedDestinationsInPositionOrder()
    {
        var trip = new Trip("Hue", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1);
        var day = trip.Days.Single();
        day.AddDestination(SetId(new Destination("First", 4.0, "cultural"), 1));
        day.AddDestination(SetId(new Destination("Second", 4.1, "cultural"), 2));
        day.ReorderDestinations(new[] { 2, 1 });

        var response = _mapper.MapToTripResponse(trip);

        Assert.Equal(
            new[] { "Second", "First" },
            response.TripDays.Single().Destinations.Select(item => item.Name));
    }

    [Fact]
    public void MapToTripResponseList_MapsEveryTripInOrder()
    {
        var trips = new List<Trip>
        {
            new("Paris", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 1), 1),
            new("Rome", new DateOnly(2024, 7, 1), new DateOnly(2024, 7, 2), 1),
        };
        trips[1].AddSavedPlace(new Destination("Colosseum", 4.9, "historic", null, "xid-colosseum"));

        var responses = _mapper.MapToTripResponseList(trips);

        Assert.Equal(new[] { "Paris", "Rome" }, responses.Select(trip => trip.Name));
        Assert.Empty(responses[0].SavedPlaces);
        Assert.Equal("xid-colosseum", Assert.Single(responses[1].SavedPlaces).Xid);
        Assert.Equal(2, responses[1].TripDays.Count);
    }

    [Fact]
    public void MapToTripResponseList_EmptyInput_ReturnsEmptyList()
    {
        var responses = _mapper.MapToTripResponseList([]);

        Assert.Empty(responses);
    }

    [Fact]
    public void MapToDestinationResponseList_MapsEveryDestinationInOrder()
    {
        var destinations = new List<Destination>
        {
            SetId(new Destination("Louvre", 4.9, "museums", "9am-6pm", "xid-louvre"), 1),
            SetId(new Destination("Pho Hoa", 4.4, "foods", null, null), 2),
        };

        var responses = _mapper.MapToDestinationResponseList(destinations);

        Assert.Equal(new[] { "Louvre", "Pho Hoa" }, responses.Select(item => item.Name));
        Assert.Equal(new[] { 1, 2 }, responses.Select(item => item.Id));
        Assert.Equal("xid-louvre", responses[0].Xid);
        Assert.Null(responses[1].Xid);
        Assert.Null(responses[1].OpeningHours);
    }

    [Fact]
    public void MapToDestinationResponseList_EmptyInput_ReturnsEmptyList()
    {
        var responses = _mapper.MapToDestinationResponseList([]);

        Assert.Empty(responses);
    }

    private static Destination SetId(Destination destination, int id)
    {
        typeof(Destination)
            .GetProperty(nameof(Destination.Id))!
            .SetValue(destination, id);
        return destination;
    }
}
