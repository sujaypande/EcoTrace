import { NextRequest, NextResponse } from "next/server";

type PhotonFeature = {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

function formatPlaceLabel(properties: PhotonFeature["properties"]): string {
  const street = [properties.housenumber, properties.street]
    .filter(Boolean)
    .join(" ");
  const parts = [
    properties.name,
    street,
    properties.city,
    properties.state,
    properties.postcode,
    properties.country,
  ].filter((part, index, arr) => part && arr.indexOf(part) === index);

  return parts.join(", ");
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("lang", "en");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "EcoTrace/1.0",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Location search failed" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as { features?: PhotonFeature[] };
    const results = (data.features ?? [])
      .map((feature) => formatPlaceLabel(feature.properties))
      .filter(Boolean);

    return NextResponse.json({ results: [...new Set(results)] });
  } catch (error) {
    console.error("Places search error:", error);
    return NextResponse.json(
      { error: "Location search failed" },
      { status: 500 }
    );
  }
}
