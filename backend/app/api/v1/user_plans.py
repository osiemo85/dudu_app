from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.models.user_plans import Account, Credentials, Registration, SavePlanRequest, SavedPlan, SavedPlanDetail, NoteCreate, PlanNote
from app.services import accounts, user_plans
from app.core.config import settings

router = APIRouter(tags=['accounts'])


def check_origin(request: Request) -> None:
    origin = request.headers.get('origin')
    if origin and origin.rstrip('/') != settings.frontend_url:
        raise HTTPException(status_code=403, detail='Origin not allowed.')


@router.post('/auth/register', response_model=Account, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_origin)])
def register(data: Registration, response: Response, request: Request) -> Account:
    return accounts.register(data, response, request)


@router.post('/auth/login', response_model=Account, dependencies=[Depends(check_origin)])
def login(data: Credentials, response: Response, request: Request) -> Account:
    return accounts.login(data, response, request)


@router.post('/auth/logout', status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_origin)])
def logout(request: Request, response: Response) -> None:
    accounts.logout(request, response)


@router.get('/auth/me', response_model=Account)
def me(account: Account = Depends(accounts.current_user)) -> Account:
    return account


# Saved plans use the existing ownership-checked service and current-user dependency.

@router.get('/saved-plans', response_model=list[SavedPlan])
def saved_plans(account: Account = Depends(accounts.current_user)) -> list[SavedPlan]:
    return user_plans.list_plans(account.id)

@router.post('/saved-plans', response_model=SavedPlan, status_code=201, dependencies=[Depends(check_origin)])
def save_plan(data: SavePlanRequest, account: Account = Depends(accounts.current_user)) -> SavedPlan:
    return user_plans.save(account.id, data)

@router.get('/saved-plans/{plan_id}', response_model=SavedPlanDetail)
def plan_detail(plan_id: int, account: Account = Depends(accounts.current_user)) -> SavedPlanDetail:
    return user_plans.detail(account.id, plan_id)

@router.post('/saved-plans/{plan_id}/notes', response_model=PlanNote, status_code=201, dependencies=[Depends(check_origin)])
def plan_note(plan_id: int, data: NoteCreate, account: Account = Depends(accounts.current_user)) -> PlanNote:
    return user_plans.add_note(account.id, plan_id, data)


from app.models.user_plans import ProfileUpdate

@router.patch('/auth/me', response_model=Account, dependencies=[Depends(check_origin)])
def update_profile(data: ProfileUpdate, account: Account = Depends(accounts.current_user)) -> Account:
    return accounts.update_profile(account.id, data.name)
