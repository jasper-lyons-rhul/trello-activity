class SessionsController < ApplicationController
  def create
    redirect_to organizations_url({
      oauth_token: auth.credentials.token,
      oauth_token_secret: auth.credentials.secret
    })
  end

  def auth
    request.env['omniauth.auth']
  end
end
