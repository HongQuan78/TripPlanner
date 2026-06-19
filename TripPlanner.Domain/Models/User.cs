namespace TripPlanner.Domain.Models;

public class User
{
    public int Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string Role { get; private set; } = string.Empty;

    private User() { }

    public User(string email, string passwordHash, string role = "User")
    {
        Email = email;
        PasswordHash = passwordHash;
        Role = role;
    }
}
