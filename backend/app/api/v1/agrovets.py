from fastapi import APIRouter, Depends, Response, status

from app.models.agrovet_inventory import DiseaseOption, DrugListing, DrugListingInput, MyAgrovet
from app.models.user_plans import Account
from app.services.accounts import current_user
from app.services import agrovet_inventory

router = APIRouter(prefix="/agrovets", tags=["agrovet drug listings"])


@router.get("/mine", response_model=list[MyAgrovet])
def my_agrovets(account: Account = Depends(current_user)) -> list[MyAgrovet]:
    return agrovet_inventory.list_mine(account.id)


@router.get("/diseases", response_model=list[DiseaseOption])
def diseases(_: Account = Depends(current_user)) -> list[DiseaseOption]:
    return agrovet_inventory.disease_options()


@router.post("/{agrovet_id}/drugs", response_model=DrugListing, status_code=201)
def add_drug(agrovet_id: int, listing: DrugListingInput, account: Account = Depends(current_user)) -> DrugListing:
    return agrovet_inventory.save_listing(agrovet_id, account.id, listing)


@router.put("/{agrovet_id}/drugs/{listing_id}", response_model=DrugListing)
def update_drug(agrovet_id: int, listing_id: int, listing: DrugListingInput, account: Account = Depends(current_user)) -> DrugListing:
    return agrovet_inventory.save_listing(agrovet_id, account.id, listing, listing_id)


@router.delete("/{agrovet_id}/drugs/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_drug(agrovet_id: int, listing_id: int, account: Account = Depends(current_user)) -> Response:
    agrovet_inventory.delete_listing(agrovet_id, account.id, listing_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
