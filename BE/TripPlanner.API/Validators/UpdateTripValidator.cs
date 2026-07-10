using FluentValidation;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Validators;

public class UpdateTripValidator : AbstractValidator<UpdateTripRequest>
{
    public UpdateTripValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Trip name is required.");

        RuleFor(x => x.StartDate)
            .NotNull()
            .WithMessage("Start date is required.");

        RuleFor(x => x.EndDate)
            .NotNull()
            .WithMessage("End date is required.");

        RuleFor(x => x)
            .Must(x => x.EndDate!.Value >= x.StartDate!.Value)
            .When(x => x.StartDate.HasValue && x.EndDate.HasValue)
            .WithMessage("End date must be after start date.");
    }
}
