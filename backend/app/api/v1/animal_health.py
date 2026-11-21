from fastapi import APIRouter, Depends, HTTPException
from app.models.animal_health import AnimalRequest, AnimalResponse, SaveAnimalCase, AnimalCase
from app.models.user_plans import Account
from app.services.accounts import current_user
from app.services.animal_health import assess, save_case, list_cases
from app.api.v1.user_plans import check_origin
router=APIRouter(prefix='/animal-health', tags=['animal health'])

@router.post('/assess', response_model=AnimalResponse)
def assessment(request: AnimalRequest): return assess(request)

@router.post('/cases', response_model=AnimalCase, status_code=201, dependencies=[Depends(check_origin)])
def save(request: SaveAnimalCase, account: Account=Depends(current_user)):
    return save_case(account.id, request.observation, request.consent)

@router.get('/cases', response_model=list[AnimalCase])
def cases(account: Account=Depends(current_user)): return list_cases(account.id)

@router.get('/cases/{case_id}', response_model=AnimalCase)
def case(case_id: int, account: Account=Depends(current_user)):
    record=next((case for case in list_cases(account.id) if case.id == case_id),None)
    if record is None: raise HTTPException(404,'Animal case not found.')
    return record
