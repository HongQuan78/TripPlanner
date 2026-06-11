using AutoMapper;
using NSubstitute;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces;
using TripPlanner.Application.UseCases.Implementations;
using TripPlanner.Domain.Models;

namespace TripPlanner.Tests;

public class TripServiceTests
{
    private readonly ITripRepository _tripRepository = Substitute.For<ITripRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IMapper _mapper = Substitute.For<IMapper>();
    private readonly TripService _sut;

    public TripServiceTests()
    {
        _sut = new TripService(_tripRepository, _unitOfWork, _mapper);
    }

    [Fact]
    public async Task GetTripAsync_ExistingId_ReturnsSuccessResult()
    {
        var trip = new Trip("Paris Trip", new DateOnly(2024, 6, 1), new DateOnly(2024, 6, 3));
        var expected = new TripResponse { Id = 1, Name = "Paris Trip" };
        _tripRepository.GetWithDaysAndDestinationsAsync(1, Arg.Any<CancellationToken>()).Returns(trip);
        _mapper.Map<TripResponse>(trip).Returns(expected);

        var result = await _sut.GetTripAsync(1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
    }

    [Fact]
    public async Task GetTripAsync_NonExistingId_ReturnsNotFoundFailure()
    {
        _tripRepository.GetWithDaysAndDestinationsAsync(99, Arg.Any<CancellationToken>()).Returns((Trip?)null);

        var result = await _sut.GetTripAsync(99);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
    }

    [Fact]
    public async Task GetAllTripsAsync_WithTrips_ReturnsSuccessResult()
    {
        var trips = new List<Trip> { new Trip("Trip A", new DateOnly(2024, 1, 1), new DateOnly(2024, 1, 2)) };
        var expected = new List<TripResponse> { new TripResponse { Name = "Trip A" } };
        _tripRepository.GetAllWithDaysAndDestinationsAsync(Arg.Any<CancellationToken>()).Returns(trips);
        _mapper.Map<List<TripResponse>>(trips).Returns(expected);

        var result = await _sut.GetAllTripsAsync();

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
    }

    [Fact]
    public async Task CreateTripAsync_ValidRequest_ReturnsSuccessResult()
    {
        var request = new CreateTripRequest { Name = "Rome Trip", StartDate = "2024-07-01", EndDate = "2024-07-05" };
        var expected = new TripResponse { Name = "Rome Trip" };
        _mapper.Map<TripResponse>(Arg.Any<Trip>()).Returns(expected);

        var result = await _sut.CreateTripAsync(request);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        _tripRepository.Received(1).Add(Arg.Any<Trip>());
    }

    [Fact]
    public async Task GetAllTripsAsync_EmptyRepository_ReturnsSuccessWithEmptyList()
    {
        var trips = new List<Trip>();
        var expected = new List<TripResponse>();
        _tripRepository.GetAllWithDaysAndDestinationsAsync(Arg.Any<CancellationToken>()).Returns(trips);
        _mapper.Map<List<TripResponse>>(trips).Returns(expected);

        var result = await _sut.GetAllTripsAsync();

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Data!);
    }
}
