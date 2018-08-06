require 'sinatra/base'
require './index.rb'
require './organizations.rb'
require './organization.rb'

class Server < Sinatra::Base
  enable :sessions

  get '/' do
    Index.new
  end

  post '/login' do
    redirect '/' unless params['token']

    session['token'] = params['token']

    redirect '/organizations'
  end

  get '/organizations' do
    redirect '/' unless session['token']
    Organizations.new
  end

  get '/organizations/:id' do
    redirect '/' unless session['token']
    Organization.new
  end
end
