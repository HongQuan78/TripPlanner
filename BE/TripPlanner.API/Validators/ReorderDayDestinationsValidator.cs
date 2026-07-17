using FluentValidation;
using TripPlanner.Application.DTOs.Requests;

namespace TripPlanner.API.Validators;

public class ReorderDayDestinationsValidator : AbstractValidator<ReorderDayDestinationsRequest>
{
    public ReorderDayDestinationsValidator()
    {
        RuleFor(x => x.DestinationIds)
        .NotNull()
        .WithMessage("Destination ids are required.")
        .NotEmpty()
        .WithMessage("Destination ids are required.");

        RuleForEach(x => x.DestinationIds)
        .GreaterThan(0)
        .WithMessage("Destination id must be greater than 0.");

        RuleFor(x => x.DestinationIds)
        .Must(ids => ids!.Distinct().Count() == ids!.Count)
        .When(x => x.DestinationIds is not null)
        .WithMessage("Destination ids must be distinct.");
    }
}
