from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.models.user_plans import Account, Credentials, Registration
from app.services import accounts
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
