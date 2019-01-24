class OrganizationsController < ApplicationController
  def index
    @oauth_token = oauth_token
    @oauth_token_secret = oauth_secret
  end

  def oauth_token
    session[:oauth_token] ||= params[:oauth_token]
  end

  def oauth_secret
    session[:oauth_token_secret] ||= params[:oauth_token_secret]
  end
end
