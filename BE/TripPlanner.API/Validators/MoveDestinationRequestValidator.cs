using FluentValidation;
using TripPlanner.Application.DTOs.Requests;
using TripPlanner.Application.Helpers;

namespace TripPlanner.API.Validators;

public class MoveDestinationRequestValidator : AbstractValidator<MoveDestinationRequest>
{
    public MoveDestinationRequestValidator()
    {
        RuleFor(x => x.ToDate)
        .NotNull()
        .WithMessage("Target date is required.")
        .NotEmpty()
        .WithMessage("Target date is required.");

        RuleFor(x => x.ToDate)
        .Must(DateHelper.IsValidDateOnly!)
        .When(x => !string.IsNullOrEmpty(x.ToDate))
        .WithMessage("Date must be formatted as YYYY-MM-DD.");
    }
}
