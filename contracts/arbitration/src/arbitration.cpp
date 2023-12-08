#include "../include/arbitration.hpp"

//======================== config actions ========================

ACTION arbitration::init()
{
    //authenticate
    require_auth(get_self());


}

