using AutoMapper;
using NSubstitute;
using Xunit;
using TripPlanner.Application.Common;
using TripPlanner.Application.DTOs.Responses;
using TripPlanner.Application.Interfaces;
using TripPlanner.Application.Parameters;
using TripPlanner.Application.UseCases.Implementations;
using TripPlanner.Domain.Models;

namespace TripPlanner.Tests;

public class DestinationServiceTests
{
    private readonly IDestinationRepository _destinationRepository = Substitute.For<IDestinationRepository>();
    private readonly IMapper _mapper = Substitute.For<IMapper>();
    private readonly DestinationService _sut;

    public DestinationServiceTests()
    {
        _sut = new DestinationService(_destinationRepository, _mapper);
    }

    [Fact]
    public async Task GetAllDestinationsAsync_ReturnsSuccessResult()
    {
        var destinations = new List<Destination>
        {
            new Landmark("Eiffel Tower", 4.8, "9am-11pm"),
            new Restaurant("Le Jules Verne", 4.5, "French", false)
        };
        var expected = new List<DestinationResponse>
        {
            new DestinationResponse { Name = "Eiffel Tower", Category = "Landmark" },
            new DestinationResponse { Name = "Le Jules Verne", Category = "Restaurant" }
        };
        var filter = new DestinationFilterParameter();
        _destinationRepository.GetFilteredAsync(filter, Arg.Any<CancellationToken>()).Returns(destinations);
        _mapper.Map<List<DestinationResponse>>(destinations).Returns(expected);

        var result = await _sut.GetAllDestinationsAsync(filter);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
    }

    [Theory]
    [InlineData("Landmark")]
    [InlineData("Restaurant")]
    public async Task GetAllDestinationsAsync_WithCategoryFilter_ReturnsSuccessResult(string category)
    {
        var filter = new DestinationFilterParameter { Category = category };
        var destinations = new List<Destination>();
        var expected = new List<DestinationResponse>();
        _destinationRepository.GetFilteredAsync(filter, Arg.Any<CancellationToken>()).Returns(destinations);
        _mapper.Map<List<DestinationResponse>>(destinations).Returns(expected);

        var result = await _sut.GetAllDestinationsAsync(filter);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task GetDestinationByIdAsync_ExistingId_ReturnsSuccessResult()
    {
        var destination = new Landmark("Louvre", 4.9, "9am-6pm");
        var expected = new DestinationResponse { Name = "Louvre", Category = "Landmark" };
        _destinationRepository.GetByIdAsync(1, Arg.Any<CancellationToken>()).Returns(destination);
        _mapper.Map<DestinationResponse>(destination).Returns(expected);

        var result = await _sut.GetDestinationByIdAsync(1);

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Data);
    }

    [Fact]
    public async Task GetDestinationByIdAsync_NonExistingId_ReturnsNotFoundFailure()
    {
        _destinationRepository.GetByIdAsync(99, Arg.Any<CancellationToken>()).Returns((Destination?)null);

        var result = await _sut.GetDestinationByIdAsync(99);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.ErrorType);
        Assert.Equal("Destination Id does not exist.", result.Error.Description);
    }
}
