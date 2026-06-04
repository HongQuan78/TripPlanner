
using System.Text.Json.Nodes;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace TripPlanner.API.Configurations.Swagger;
public class DateOnlyStringSchemaFilter : ISchemaFilter
{
    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema is not OpenApiSchema openApiSchema || openApiSchema.Properties is null)
        {
            return;
        }

        foreach (var property in openApiSchema.Properties)
        {
            var propertyName = property.Key;

            if (!propertyName.Contains("date", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (property.Value is not OpenApiSchema propertySchema)
            {
                continue;
            }

            propertySchema.Type = JsonSchemaType.String;
            propertySchema.Format = "date";
            propertySchema.Example = JsonValue.Create("2026-06-01");
            propertySchema.Description = "Date must be formatted as yyyy-MM-dd.";
        }
    }
}