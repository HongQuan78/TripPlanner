using FluentValidation;
using FluentValidation.TestHelper;
using TripPlanner.API.DTOs.Requests;
using TripPlanner.API.Helpers;

namespace TripPlanner.API.Validators;

public class CreateTripValidator : AbstractValidator<CreateTripRequest>
{
    public CreateTripValidator()
    {
        RuleFor(x => x.Name)
        .NotEmpty()
        .WithMessage("Trip name is required.");
        
        RuleFor(x => x.StartDate)
        .NotEmpty()
        .WithMessage("Start date is required.")
        .Must(DateHelper.IsValidDateOnly!)
        .WithMessage("Date must be formatted as YYYY-MM-DD.");

        RuleFor(x => x.EndDate)
        .NotEmpty()
        .WithMessage("End date is required.")
        .Must(DateHelper.IsValidDateOnly!)
        .WithMessage("Date must be formatted as YYYY-MM-DD.")
        .GreaterThanOrEqualTo(x => x.StartDate)
        .WithMessage("End date must be after start date.");
    }

}