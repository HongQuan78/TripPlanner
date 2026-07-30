using FluentValidation;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Validators;

public class ScheduleSavedPlaceValidator : AbstractValidator<ScheduleSavedPlaceRequest>
{
    public ScheduleSavedPlaceValidator()
    {
        RuleFor(x => x.DestinationId)
        .NotNull()
        .WithMessage("Destination Id is required.")
        .GreaterThan(0)
        .When(x => x.DestinationId.HasValue)
        .WithMessage("Destination Id must be greater than 0.");
    }
}
