using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDestinationExternalId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "destinations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 1,
                column: "ExternalId",
                value: null);

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 2,
                column: "ExternalId",
                value: null);

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 3,
                column: "ExternalId",
                value: null);

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 4,
                column: "ExternalId",
                value: null);

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 5,
                column: "ExternalId",
                value: null);

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 6,
                column: "ExternalId",
                value: null);

            migrationBuilder.CreateIndex(
                name: "IX_destinations_ExternalId",
                table: "destinations",
                column: "ExternalId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_destinations_ExternalId",
                table: "destinations");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "destinations");
        }
    }
}
