namespace TripPlanner.Domain.Models;
public abstract class Destination(int id, string name, double rating)
{
    public int Id { get; } = id;
    public string Name { get; } = name;
    public double Rating { get; } = rating;
    public abstract string Category { get;}
}