ENV['RACK_ENV'] = 'test'

require 'minitest/autorun'
require 'rack/test'

require_relative '../server.rb'

module Rack
  class MockResponse
    def initialize(status, headers, body, errors = StringIO.new(""))
      @original_headers = headers
      @errors = errors.string if errors.respond_to?(:string)
      @body_object = body

      super(body, status, headers)
    end

    def body_object
      @body_object
    end
  end
end

describe Server do
  include Rack::Test::Methods

  def app
    Class.new(Server) do
      def initialize(app = nil)
        request_cache = Class.new do
          def fetch(key, &block)
            '{}'
          end
        end.new

        super(app, request_cache)
      end

      private

      def me
        Struct.new(:organizations).new([])
      end
    end.new()
  end

  describe '/' do
    it 'should return the home page at root' do
      get '/'
      expect(last_response.body_object).must_be_instance_of(Index)
    end
  end

  describe '/login' do
    it 'should return to root without a token' do
      post '/login'

      expect(last_response.redirect?).must_equal(true)
      expect(last_response.location).must_equal('http://example.org/')
    end

    it 'should set the rack.session.token value when given a token' do
      post '/login', { 'token' => 'test' }

      expect(last_response.redirect?).must_equal(true)
      expect(last_response.location).must_match(/\/organizations$/)
      expect(last_request.env['rack.session']['token']).must_equal('test');
    end
  end

  describe '/organizations' do
    it 'should redirect to root if no token is present' do
      get '/organizations'
      expect(last_response.redirect?).must_equal(true)
      expect(last_response.location).must_equal('http://example.org/')
    end

    it 'should return Organizations view is token is present' do
      get '/organizations', {}, { 'rack.session' => { 'token' => '' } }
      expect(last_response.redirect?).must_equal(false)
      expect(last_response.body_object).must_be_instance_of(Organizations)
    end
  end

  describe '/organizations/:id' do
    it 'should redirect to root if no token is present' do
      get '/organizations/1'
      expect(last_response.redirect?).must_equal(true)
      expect(last_response.location).must_equal('http://example.org/')
    end

    it 'should return Organization view if the token is present' do
      get '/organizations/1', {}, { 'rack.session' => { 'token' => '' } }
      expect(last_response.body_object).must_be_instance_of(Organization)
    end
  end
end
