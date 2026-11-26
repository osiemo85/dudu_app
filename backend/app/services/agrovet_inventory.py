"""Owner-scoped, unverified drug and disease listings."""
from datetime import UTC, datetime

from fastapi import HTTPException

from app.data_access.database import IntegrityError, database
from app.models.agrovet_inventory import DiseaseOption, DrugListingInput, MyAgrovet, DrugListing


def _shop(connection, shop_id: int, user_id: int):
    row = connection.execute("SELECT id,name,county,area FROM agrovets WHERE id=? AND owner_user_id=?", (shop_id, user_id)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Assigned agrovet not found")
    return row


def list_mine(user_id: int) -> list[MyAgrovet]:
    with database() as connection:
        shops = connection.execute("""SELECT agrovets.id,agrovets.name,agrovets.county,agrovets.area,
            diseases.common_name AS initial_disease_name,agrovets.treatment_name AS initial_treatment_name
            FROM agrovets JOIN diseases ON diseases.id=agrovets.disease_id
            WHERE agrovets.owner_user_id=? ORDER BY agrovets.name,agrovets.id""", (user_id,)).fetchall()
        return [MyAgrovet(**dict(shop), drugs=[DrugListing(**dict(row)) for row in connection.execute(
            """SELECT d.id,d.agrovet_id,d.disease_id,d.drug_name,d.availability_status,d.reported_at,
                      diseases.common_name disease_name FROM agrovet_drugs d
               JOIN diseases ON diseases.id=d.disease_id WHERE d.agrovet_id=? ORDER BY d.drug_name,d.id""",
            (shop["id"],),
        ).fetchall()]) for shop in shops]


def disease_options() -> list[DiseaseOption]:
    with database() as connection:
        rows = connection.execute("SELECT id,crop,common_name AS name FROM diseases ORDER BY crop,common_name,id").fetchall()
    return [DiseaseOption(**dict(row)) for row in rows]


def save_listing(shop_id: int, user_id: int, listing: DrugListingInput, listing_id: int | None = None) -> DrugListing:
    with database() as connection:
        _shop(connection, shop_id, user_id)
        disease = connection.execute("SELECT common_name FROM diseases WHERE id=?", (listing.disease_id,)).fetchone()
        if not disease:
            raise HTTPException(status_code=422, detail="Choose a disease from the disease table")
        duplicate = connection.execute(
            """SELECT 1 FROM agrovet_drugs WHERE agrovet_id=? AND disease_id=?
               AND lower(drug_name)=lower(?) AND id<>? LIMIT 1""",
            (shop_id, listing.disease_id, listing.drug_name, listing_id or -1),
        ).fetchone()
        if duplicate:
            raise HTTPException(status_code=409, detail="This drug and disease are already listed for the agrovet")
        when = datetime.now(UTC).isoformat()
        try:
            if listing_id is None:
                cursor = connection.execute(
                    """INSERT INTO agrovet_drugs(agrovet_id,disease_id,drug_name,availability_status,reported_at,reported_by_user_id)
                       VALUES (?,?,?,?,?,?)""",
                    (shop_id, listing.disease_id, listing.drug_name, listing.availability_status, when, user_id),
                )
                listing_id = cursor.lastrowid
            else:
                cursor = connection.execute(
                    """UPDATE agrovet_drugs SET disease_id=?,drug_name=?,availability_status=?,reported_at=?,reported_by_user_id=?
                       WHERE id=? AND agrovet_id=?""",
                    (listing.disease_id, listing.drug_name, listing.availability_status, when, user_id, listing_id, shop_id),
                )
                if cursor.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Drug listing not found")
        except IntegrityError:
            raise HTTPException(status_code=409, detail="This drug and disease are already listed for the agrovet") from None
        row = connection.execute(
            """SELECT d.id,d.agrovet_id,d.disease_id,d.drug_name,d.availability_status,d.reported_at,
                      diseases.common_name disease_name FROM agrovet_drugs d
               JOIN diseases ON diseases.id=d.disease_id WHERE d.id=?""", (listing_id,),
        ).fetchone()
        return DrugListing(**dict(row))


def delete_listing(shop_id: int, user_id: int, listing_id: int) -> None:
    with database() as connection:
        _shop(connection, shop_id, user_id)
        deleted = connection.execute("DELETE FROM agrovet_drugs WHERE id=? AND agrovet_id=?", (listing_id, shop_id))
        if deleted.rowcount == 0:
            raise HTTPException(status_code=404, detail="Drug listing not found")
