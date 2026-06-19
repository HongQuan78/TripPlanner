using FluentValidation;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Validators;

public class AddDestinationToDayValidator : AbstractValidator<AddDestinationToDayRequest>
{
    public AddDestinationToDayValidator()
    {
        RuleFor(x => x.DestinationId)
        .NotEmpty()
        .WithMessage("Destination Id is required.");
    }
}