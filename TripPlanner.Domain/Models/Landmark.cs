namespace TripPlanner.Domain.Models;

public class Landmark : Destination
{
    public string OpeningHours { get; private set; } = string.Empty;
    public override string Category => "Landmark";

    private Landmark() { }

    public Landmark(string name, double rating, string openingHours) : base(name, rating)
    {
        OpeningHours = openingHours;
    }
}
