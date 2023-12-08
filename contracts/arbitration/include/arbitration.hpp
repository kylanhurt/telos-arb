// Example contract that can create, update, and delete tasks.
//
// @author Awesome Developer Person
// @contract arbitration
// @version v1.1.0

#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <eosio/action.hpp>

using namespace std;
using namespace eosio;

CONTRACT arbitration : public contract
{
    public:

    arbitration(name self, name code, datastream<const char*> ds) : contract(self, code, ds) {};
    ~arbitration() {};

    //======================== config actions ========================

    //initialize the contract
    //auth: self
    ACTION init();
};