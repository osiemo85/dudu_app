from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.models.user_plans import Account, Credentials, NoteCreate, PlanNote, SavePlanRequest, SavedPlan, SavedPlanDetail
from app.services import accounts, user_plans

router = APIRouter(tags=['accounts and saved plans'])


def check_origin(request: Request) -> None:
    origin = request.headers.get('origin')
    if origin and origin not in {'http://localhost:3000', 'http://127.0.0.1:3000'}:
        raise HTTPException(status_code=403, detail='Origin not allowed.')


@router.post('/auth/register', response_model=Account, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_origin)])
def register(data: Credentials, response: Response, request: Request) -> Account:
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


@router.post('/saved-plans', response_model=SavedPlan, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_origin)])
def save(data: SavePlanRequest, account: Account = Depends(accounts.current_user)) -> SavedPlan:
    return user_plans.save(account.id, data)


@router.get('/saved-plans', response_model=list[SavedPlan])
def list_plans(account: Account = Depends(accounts.current_user)) -> list[SavedPlan]:
    return user_plans.list_plans(account.id)


@router.get('/saved-plans/{plan_id}', response_model=SavedPlanDetail)
def detail(plan_id: int, account: Account = Depends(accounts.current_user)) -> SavedPlanDetail:
    return user_plans.detail(account.id, plan_id)


@router.post('/saved-plans/{plan_id}/notes', response_model=PlanNote, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_origin)])
def add_note(plan_id: int, note: NoteCreate, account: Account = Depends(accounts.current_user)) -> PlanNote:
    return user_plans.add_note(account.id, plan_id, note)
