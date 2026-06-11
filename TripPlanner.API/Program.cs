using DotNetEnv;
using TripPlanner.API.Extensions;
using TripPlanner.API.Middleware;

var envFile = FindEnvFile();
if (envFile is not null)
    Env.Load(envFile);

static string? FindEnvFile()
{
    var directory = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (directory is not null)
    {
        var candidate = Path.Combine(directory.FullName, ".env");
        if (File.Exists(candidate))
            return candidate;
        directory = directory.Parent;
    }
    return null;
}

const string PolicyName = "AllowLocalhost";
var builder = WebApplication.CreateBuilder(args);

builder.Services
.AddApplicationServices(builder.Configuration)
.AddCustomCors(PolicyName)
.AddCustomSwagger();

builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{   
    app.UseCustomSwagger();
}
app.UseMiddleware<LoggingMiddleware>();
app.AddRoute();
app.UseCors(PolicyName);
app.UseResponseCompression();

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.Run();
