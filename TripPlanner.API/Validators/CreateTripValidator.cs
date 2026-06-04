using FluentValidation;
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
        .WithMessage("Date must be formatted as YYYY-MM-DD.");

        RuleFor(x => x)
        .Must(x => DateHelper.ToDateOnly(x.EndDate!) >= DateHelper.ToDateOnly(x.StartDate!))
        .When(x => DateHelper.IsValidDateOnly(x.StartDate!) && DateHelper.IsValidDateOnly(x.EndDate!))
        .WithMessage("End date must be after start date.");
    }

}