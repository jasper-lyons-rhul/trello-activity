require 'sinatra/base'

require './lib/trello.rb'
require './index.rb'
require './organizations.rb'
require './organization.rb'

class Server < Sinatra::Base
  enable :sessions

  def initialize(app = nil, request_cache = {})
    super(app)
    @request_cache = request_cache
  end

  attr_reader :request_cache

  get '/' do
    Index.new(ENV['TRELLO_KEY'])
  end

  post '/login' do
    redirect '/' unless params['token']

    session['token'] = params['token']

    redirect '/organizations'
  end

  get '/organizations' do
    redirect '/' unless session['token']
    Organizations.new(me.organizations)
  end

  get '/organizations/:id' do
    redirect '/' unless session['token']
    Organization.new(organization(params['id']).load)
  end

  private

  def me
    member('me')
  end

  def organization(id)
    Trello::Organization.new(http, { 'id' => id }, request_cache)
  end

  def member(id)
    Trello::Member.new(http, { 'id' => id }, request_cache)
  end

  def http
    @http ||= Http.new({}, {
      key: ENV['TRELLO_KEY'],
      token: session['token']
    }, request_cache)
  end
end
