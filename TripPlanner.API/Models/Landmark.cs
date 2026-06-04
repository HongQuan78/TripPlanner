namespace TripPlanner.API.Models;

public class Landmark(int id, string name, double rating, string openingHours) : Destination(id, name, rating)
{
    public string OpeningHours { get; set; } = openingHours;
    public override string Category => "Landmark";
}