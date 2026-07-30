using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace TripPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FlattenDestinationHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "destinations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE destinations SET \"Category\" = CASE destination_type " +
                "WHEN 'Restaurant' THEN 'foods' ELSE 'interesting_places' END;");

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "destinations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false);

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 1,
                column: "Category",
                value: "architecture");

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 2,
                column: "Category",
                value: "historic");

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 3,
                column: "Category",
                value: "amusements");

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 4,
                column: "Category",
                value: "foods");

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 5,
                column: "Category",
                value: "foods");

            migrationBuilder.UpdateData(
                table: "destinations",
                keyColumn: "Id",
                keyValue: 6,
                column: "Category",
                value: "foods");

            migrationBuilder.DropColumn(
                name: "destination_type",
                table: "destinations");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "destination_type",
                table: "destinations",
                type: "character varying(13)",
                maxLength: 13,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE destinations SET destination_type = CASE \"Category\" " +
                "WHEN 'foods' THEN 'Restaurant' ELSE 'Landmark' END;");

            migrationBuilder.AlterColumn<string>(
                name: "destination_type",
                table: "destinations",
                type: "character varying(13)",
                maxLength: 13,
                nullable: false);

            migrationBuilder.DropColumn(
                name: "Category",
                table: "destinations");

            migrationBuilder.InsertData(
                table: "destinations",
                columns: new[] { "Id", "ExternalId", "Name", "OpeningHours", "Rating", "destination_type" },
                values: new object[,]
                {
                    { 1, null, "Landmark 81", "08:00 - 22:00", 4.5, "Landmark" },
                    { 2, null, "Hoi An Ancient Town", "Open all day", 4.8, "Landmark" },
                    { 3, null, "Vinpearl Safari Phu Quoc", "09:00 - 16:00", 4.6, "Landmark" }
                });

            migrationBuilder.InsertData(
                table: "destinations",
                columns: new[] { "Id", "ExternalId", "Name", "Rating", "destination_type" },
                values: new object[,]
                {
                    { 4, null, "Com que duong bau", 4.4, "Restaurant" },
                    { 5, null, "Pho Hoa Pasteur", 4.5, "Restaurant" },
                    { 6, null, "Com tam 3 anh em", 4.4, "Restaurant" }
                });
        }
    }
}
